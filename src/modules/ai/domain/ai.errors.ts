import { AiProvider } from '@/generated/prisma/enums';

export class AiProviderError extends Error {
  constructor(
    public readonly provider: AiProvider,
    public readonly model: string,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = AiProviderError.name;
  }
}

export class AllAiProvidersFailedError extends Error {
  constructor(public readonly errors: AiProviderError[]) {
    super('All configured AI providers failed');
    this.name = AllAiProvidersFailedError.name;
  }
}
