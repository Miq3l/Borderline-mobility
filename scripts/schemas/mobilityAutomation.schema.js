import { z } from 'zod';

export const defaultMobilitySelectors = {
  usernameInput: 'input[id="Input_UserName"]',
  passwordInput: 'input[id="Input_Password"]',
  submitButton: 'button[type="submit"]',
  postLoginReady: 'header',
  startButton: 'button[class="mb-1 btn btn-success btn-lg shadow-sm rounded-0"]',
  startedSignal: 'button[class="mb-1 mt-2 btn btn-danger btn-lg shadow-sm rounded-0"]',
};

const boundedRetrySchema = z
  .object({
    maxAttempts: z.number().int().min(1).max(5).default(2),
    initialDelayMs: z.number().int().min(100).max(5_000).default(500),
    factor: z.number().min(1).max(3).default(1.8),
    maxDelayMs: z.number().int().min(100).max(10_000).default(2_500),
  })
  .default({});

export const mobilityAutomationSchema = z.object({
  runId: z.string().trim().min(1).default('manual-run'),
  idempotencyKey: z.string().trim().min(1).optional(),
  browserWSEndpoint: z.url().default('ws://playwright_engine:3000'),
  ignoreHTTPSErrors: z.boolean().default(true),
  username: z.string().trim().min(1, 'username is required'),
  password: z.string().min(1, 'password is required'),
  loginUrl: z.url().default('https://mobility.laguilar.es:9082/account/signin'),
  postLoginUrl: z.url().default('https://mobility.laguilar.es:9082'),
  selectors: z
    .object({
      usernameInput: z.string().default(defaultMobilitySelectors.usernameInput),
      passwordInput: z.string().default(defaultMobilitySelectors.passwordInput),
      submitButton: z.string().default(defaultMobilitySelectors.submitButton),
      postLoginReady: z.string().default(defaultMobilitySelectors.postLoginReady),
      startButton: z.string().default(defaultMobilitySelectors.startButton),
      startedSignal: z.string().default(defaultMobilitySelectors.startedSignal),
    })
    .default(defaultMobilitySelectors),
  timeoutMs: z.number().int().min(1_000).max(120_000).default(30_000),
  retry: boundedRetrySchema,
});

export function validateMobilityAutomationConfig(rawInput) {
  return mobilityAutomationSchema.parse(rawInput);
}
