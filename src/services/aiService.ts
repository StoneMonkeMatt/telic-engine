
import { AIProvider, AIConfig, SimulationConfig, StepData } from "../simulation/types";
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";

const updateSettingsSchema: FunctionDeclaration = {
  name: "updateSimulationSettings",
  description: "Update the simulation parameters to explore different system behaviors.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      gamma: { type: Type.NUMBER, description: "Information weight (γ). Range 0-2." },
      delta: { type: Type.NUMBER, description: "Phi weight (δ). Range 0-2." },
      alpha: { type: Type.NUMBER, description: "Complexity cost weight (α). Range 0-2." },
      beta: { type: Type.NUMBER, description: "Energy weight (β). Range 0-2." },
      phiType: { 
        type: Type.STRING, 
        description: "The type of Phi calculation to use.",
        enum: ["none", "spatial_clustering", "info_entropy", "random_noise", "mutual_information", "conditional_entropy", "triplet_closure"]
      },
      agentCount: { type: Type.INTEGER, description: "Number of agents. Range 1-100." },
      gridSize: { type: Type.INTEGER, description: "Size of the square grid. Range 10-50." },
      visionRange: { type: Type.INTEGER, description: "Vision range of agents. Range 1-10." },
      moveSpeed: { type: Type.INTEGER, description: "Movement speed of agents. Range 1-5." },
      maxSteps: { type: Type.INTEGER, description: "Maximum simulation steps. Range 100-5000." },
      useSoftmax: { type: Type.BOOLEAN, description: "Whether to use softmax for decision making." },
      softmaxTemperature: { type: Type.NUMBER, description: "Temperature for softmax. Range 0.1-5.0." },
      softmaxAdaptive: { type: Type.BOOLEAN, description: "Whether to use adaptive softmax temperature." },
      energyDepletionRate: { type: Type.NUMBER, description: "Rate at which energy is lost per step. Range 0-1." },
      energyGainMin: { type: Type.NUMBER, description: "Minimum energy gain per step. Range 0-2." },
      energyGainMax: { type: Type.NUMBER, description: "Maximum energy gain per step. Range 0-2." },
      initialEnergyMin: { type: Type.NUMBER, description: "Minimum starting energy. Range 1-20." },
      initialEnergyMax: { type: Type.NUMBER, description: "Maximum starting energy. Range 1-20." },
      stasisThreshold: { type: Type.NUMBER, description: "Threshold for detecting stasis. Range 0-0.1." },
      chaosThreshold: { type: Type.NUMBER, description: "Threshold for detecting chaos. Range 1-20." },
      stabilityWindow: { type: Type.INTEGER, description: "Window size for stability analysis. Range 10-200." },
      
      // v13 Upgrades
      evolveParams: { type: Type.BOOLEAN, description: "Enable agent parameter evolution via mutation." },
      mutationRate: { type: Type.NUMBER, description: "Probability of parameter mutation (0-1)." },
      mutationStd: { type: Type.NUMBER, description: "Standard deviation for Gaussian mutation." },
      phiMutationRate: { type: Type.NUMBER, description: "Probability of Phi type mutation (0-1)." },
      reproductionEnabled: { type: Type.BOOLEAN, description: "Enable agent reproduction." },
      reproductionEnergyThreshold: { type: Type.NUMBER, description: "Energy required to reproduce." },
      reproductionProbBase: { type: Type.NUMBER, description: "Base probability of reproduction per step." },
      maxOffspringDist: { type: Type.INTEGER, description: "Maximum distance for offspring placement." },
      senescenceAge: { type: Type.INTEGER, description: "Age at which agents die of old age." },
      resourceField: { type: Type.BOOLEAN, description: "Enable dynamic resource field." },
      resourceHotspots: { type: Type.INTEGER, description: "Number of resource hotspots." },
      resourceSigma: { type: Type.NUMBER, description: "Spread of resource hotspots." },
      resourceMax: { type: Type.NUMBER, description: "Maximum resource value." },
      resourceRegrowRate: { type: Type.NUMBER, description: "Rate at which resources regrow." },
      resourceConsumptionFraction: { type: Type.NUMBER, description: "Fraction of local resource consumed per move." },
      toroidal: { type: Type.BOOLEAN, description: "Enable toroidal (wrapping) grid boundaries." }
    }
  }
};

const getSystemInstruction = (dataSummary: any) => `
    You are the "Telic System Analyst", an expert in multi-agent systems and emergent behavior.
    Your goal is to help the user understand the simulation results and recommend parameter adjustments to find interesting states like "Chaos", "Stability", or "Clustering".

    The Telic Equation is: T = γ·I + δ·Φ − α·K + β·E
    - γ (Gamma): Weight of individual information (I).
    - δ (Delta): Weight of collective structure (Phi).
    - α (Alpha): Weight of complexity costs (K).
    - β (Beta): Weight of energy reserves (E).

    Phi (Φ) Types:
    - info_entropy: Shannon entropy of symbols in the neighborhood.
    - spatial_clustering: Local clustering coefficient.
    - random_noise: Random values.
    - mutual_info: Mutual information between agent and neighborhood.
    - cond_entropy: Conditional entropy of neighborhood given agent.
    - triplet: Triplet closure probability.

    v13 Scientific Upgrades:
    - Evolution: Agents inherit mutated parameters from parents.
    - Reproduction: Agents can reproduce when energy is high and density is low.
    - Resource Field: A dynamic environment where agents consume and regrow resources.
    - Toroidal Grid: Boundaries wrap around, eliminating edge effects.
    - Senescence: Agents have a maximum lifespan.

    Current Simulation State:
    ${JSON.stringify(dataSummary, null, 2)}

    When asked to change settings or when you think a change would be beneficial, use the 'updateSimulationSettings' function.
    Explain WHY you are making the changes based on the current data trends.
    If the system is extinct, suggest settings that might improve survival (e.g., lower beta, higher delta, or different phi weights).
    If the system is in stasis, suggest increasing gamma or alpha to spark complexity.
    
    IMPORTANT: If you are using a tool/function call, you MUST also provide a text response explaining what you are doing.
`;

/**
 * Converts @google/genai schema (uppercase types) to standard JSON Schema (lowercase types)
 * for OpenAI/Anthropic compatibility.
 */
const convertSchemaToJsonSchema = (schema: any): any => {
  if (!schema) return schema;
  
  const newSchema = { ...schema };
  
  if (typeof newSchema.type === 'string') {
    newSchema.type = newSchema.type.toLowerCase();
  }
  
  if (newSchema.properties) {
    const newProperties: any = {};
    for (const key in newSchema.properties) {
      newProperties[key] = convertSchemaToJsonSchema(newSchema.properties[key]);
    }
    newSchema.properties = newProperties;
  }
  
  if (newSchema.items) {
    newSchema.items = convertSchemaToJsonSchema(newSchema.items);
  }
  
  return newSchema;
};

export const chatWithAI = async (
  message: string, 
  currentConfig: SimulationConfig, 
  history: StepData[],
  aiConfig: AIConfig,
  onUpdateSettings: (newConfig: any) => void
) => {
  const latestStep = history[history.length - 1];
  const dataSummary = {
    currentStep: latestStep?.step || 0,
    aliveCount: latestStep?.alive_count || 0,
    avgTelic: latestStep?.avg_telic || 0,
    avgPhi: latestStep?.avg_phi || 0,
    emergence: latestStep?.emergence,
    config: currentConfig,
    historyLength: history.length,
    telicTrend: history.slice(-10).map(h => h.avg_telic)
  };

  const systemInstruction = getSystemInstruction(dataSummary);

  if (aiConfig.provider === AIProvider.GEMINI) {
    const apiKey = aiConfig.apiKey || process.env.GEMINI_API_KEY!;
    if (!apiKey) return "Gemini API Key is missing.";
    
    const genAI = new GoogleGenAI({ apiKey });
    const model = aiConfig.model || "gemini-3.1-pro-preview";

    try {
      const response = await genAI.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: message }] }],
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: [updateSettingsSchema] }]
        }
      });

      const functionCalls = response.functionCalls;
      if (functionCalls) {
        for (const call of functionCalls) {
          if (call.name === "updateSimulationSettings") {
            onUpdateSettings(call.args as Partial<SimulationConfig>);
          }
        }
      }

      return response.text;
    } catch (error) {
      console.error("Gemini Error:", error);
      return `Gemini Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  // For other providers, we'll use a generic fetch approach to avoid installing many SDKs
  // This handles OpenAI-compatible APIs (OpenAI, DeepSeek, Grok)
  const isOpenAICompatible = [AIProvider.OPENAI, AIProvider.DEEPSEEK, AIProvider.GROK].includes(aiConfig.provider);
  
  if (isOpenAICompatible || aiConfig.provider === AIProvider.ANTHROPIC) {
    if (!aiConfig.apiKey) return `${aiConfig.provider.toUpperCase()} API Key is missing.`;

    let url = "";
    let headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    let body: any = {};

    if (isOpenAICompatible) {
      url = aiConfig.baseUrl || (
        aiConfig.provider === AIProvider.OPENAI ? "https://api.openai.com/v1/chat/completions" :
        aiConfig.provider === AIProvider.DEEPSEEK ? "https://api.deepseek.com/chat/completions" :
        "https://api.x.ai/v1/chat/completions"
      );
      headers["Authorization"] = `Bearer ${aiConfig.apiKey}`;
      body = {
        model: aiConfig.model || (
          aiConfig.provider === AIProvider.OPENAI ? "gpt-4o" :
          aiConfig.provider === AIProvider.DEEPSEEK ? "deepseek-chat" :
          "grok-beta"
        ),
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: message }
        ],
        tools: [{
          type: "function",
          function: {
            name: updateSettingsSchema.name,
            description: updateSettingsSchema.description,
            parameters: convertSchemaToJsonSchema(updateSettingsSchema.parameters)
          }
        }]
      };
    } else if (aiConfig.provider === AIProvider.ANTHROPIC) {
      url = "https://api.anthropic.com/v1/messages";
      headers["x-api-key"] = aiConfig.apiKey;
      headers["anthropic-version"] = "2023-06-01";
      headers["dangerously-allow-browser"] = "true"; // Required for client-side fetch to Anthropic
      body = {
        model: aiConfig.model || "claude-3-5-sonnet-20241022",
        system: systemInstruction,
        messages: [{ role: "user", content: message }],
        max_tokens: 1024,
        tools: [{
          name: updateSettingsSchema.name,
          description: updateSettingsSchema.description,
          input_schema: convertSchemaToJsonSchema(updateSettingsSchema.parameters)
        }]
      };
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || res.statusText);
      }

      const data = await res.json();
      
      // Handle tool calls for OpenAI-compatible
      if (isOpenAICompatible) {
        const toolCalls = data.choices[0].message.tool_calls;
        if (toolCalls) {
          for (const call of toolCalls) {
            if (call.function.name === "updateSimulationSettings") {
              onUpdateSettings(JSON.parse(call.function.arguments));
            }
          }
        }
        return data.choices[0].message.content;
      } 
      
      // Handle tool calls for Anthropic
      if (aiConfig.provider === AIProvider.ANTHROPIC) {
        let text = "";
        for (const content of data.content) {
          if (content.type === "text") text += content.text;
          if (content.type === "tool_use" && content.name === "updateSimulationSettings") {
            onUpdateSettings(content.input);
          }
        }
        return text;
      }
    } catch (error) {
      console.error(`${aiConfig.provider} Error:`, error);
      return `${aiConfig.provider.toUpperCase()} Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  return "Unsupported AI Provider.";
};
