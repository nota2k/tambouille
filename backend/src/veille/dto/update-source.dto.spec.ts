import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateSourceDto } from './update-source.dto';

describe('UpdateSourceDto — label (P2)', () => {
  it('refuse un label qui n’est qu’une chaîne d’espaces', async () => {
    // `@MinLength(1)` seul ne coupe pas les espaces : une chaîne d'espaces a
    // une longueur non nulle et passerait la validation sans le `Transform`.
    const dto = plainToInstance(UpdateSourceDto, { label: '   ' });

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'label')).toBe(true);
  });

  it('coupe les espaces autour d’un label valide avant de le stocker', async () => {
    const dto = plainToInstance(UpdateSourceDto, { label: '  Nota  ' });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.label).toBe('Nota');
  });
});
