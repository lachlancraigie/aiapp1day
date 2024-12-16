const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");

// Function definition
const searchBikeStore = {
    name: "search_bike",
    description: "Retrieves bikes from the search index based",
    parameters: {
        type: "object",
        properties: {
            location: {
                type: "string",
                description: "The location of the store (i.e. Seattle, WA)",
            },
            company: {
                type: "string",
                description: "The company of the bike",
            },
            model: {
                type: "string",
                description: "The model of the bike",
            },
        },
        required: ["location"],
    },
};


function applyToolCall({ function: call, id }) {
    if (call.name === "search_bike") {
        console.log('[applyToolCall] invoked');
        const { location, company, model } = JSON.parse(call.arguments);
        return {
            role: "tool",
            content: `The bike from ${company} company and model ${model} is available in ${location} store.`,
            toolCallId: id,
        };
    }
    throw new Error(`Unknown tool call: ${call.name}`);
}

const client = new OpenAIClient(
    "https://arg-syd-aiapp1day-openai.openai.azure.com",
    new AzureKeyCredential("0f73b2e1cba543ce8c9518712a5b1efc")
);

async function getChatResponse() {
    try {
        const options = {
            tools: [
                {
                    type: "function",
                    function: searchBikeStore,
                },
            ],
        };

        const messages = [
            {
                role: "system",
                content: "You are a grumpy sales assistance who is depressed and doesnt want to be bothered by customers.",
            },
            {
                role: "user",
                content: "I'm looking for a bike in Seattle store. Can you help me find a bike from Trek company and model Domane SLR 9?",
            },
        ];

        const result = await client.getChatCompletions("completions", messages, options);

        for (const choice of result.choices) {
            const message = choice.message;
            
            // Check if there are tool calls
            if (message.toolCalls) {
                for (const toolCall of message.toolCalls) {
                    // Apply the tool call and get the response
                    const toolResponse = applyToolCall(toolCall);
                    
                    // Add both the assistant's message and tool response to messages
                    messages.push(message);
                    messages.push(toolResponse);
                }

                // Get the final response with the tool results
                const finalResult = await client.getChatCompletions("completions", messages, options);
                console.log(finalResult.choices[0].message.content);
            } else {
                console.log(message.content);
            }
        }
    } catch (err) {
        console.error(`Error: ${err}`);
    }
}

getChatResponse();
