import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { placesResponseSchema } from '../schema/google';
import { ramenTool } from '../tools/ramen-tool';


const searchRamenShopStep = createStep({
  id: 'search-ramen-shop-step',
  inputSchema: z.object({
    prefecture: z.string().describe('都道府県名（例：大阪、東京）'),
    city: z.string().optional().describe('（例：梅田、本町）'),
    name: z.string().optional().describe('ラーメン店の名前（例：一風堂,人類みな麺類）'),
  }),
  outputSchema: z.string().describe('Token-Oriented Object Notation is a compact'),
  execute: async ({ inputData, runtimeContext }) => {
    const { prefecture, city, name } = inputData;

    const response = await ramenTool.execute({
      context: {
        prefecture,
        city,
        name
      },
      runtimeContext,
    });
    return response;
  }
});

const summarizeRamenShopStep = createStep({
  id: 'summarize-ramen-shop-step',
  inputSchema: z.string().describe('Token-Oriented Object Notation is a compact'),
  outputSchema: z.string().describe('要約されたラーメン店の情報'),
  execute: async ({ inputData, mastra }) => {
    const ramenSummaryAgent = mastra.getAgent('ramenSummaryAgent');
    if(!ramenSummaryAgent){
      throw new Error('ramenSummaryAgentが見つかりませんでした。');
    }
    const response = await ramenSummaryAgent.generate(`${inputData}`);

    console.log(response.text);
    
    return response.text;
  }
});


export const ramenWorkflow = createWorkflow({
  id: 'ramen-workflow',
  inputSchema: z.object({
    prefecture: z.string().describe('都道府県名（例：大阪、東京）'),
    city: z.string().optional().describe('（例：梅田、本町）'),
    name: z.string().optional().describe('ラーメン店の名前（例：一風堂,人類みな麺類）'),
  }),
  outputSchema: z.string().describe('要約されたラーメン店の情報'),
}).then(searchRamenShopStep).then(summarizeRamenShopStep).commit();