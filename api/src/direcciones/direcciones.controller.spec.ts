import { Test, TestingModule } from '@nestjs/testing';
import { DireccionesController } from './direcciones.controller';

describe('DireccionesController', () => {
  let controller: DireccionesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DireccionesController],
    }).compile();

    controller = module.get<DireccionesController>(DireccionesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
