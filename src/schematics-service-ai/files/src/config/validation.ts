import { plainToClass } from 'class-transformer';
import { validateSync } from 'class-validator';
import { EnvVariables } from './config';

export const validate = (config: Record<string, unknown>) => {
  const validatedConfig = plainToClass(EnvVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
};
