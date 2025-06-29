import { Test, TestingModule } from '@nestjs/testing';
import { DireccionesController } from './direcciones.controller';
import { DireccionesService } from './direcciones.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DireccionesController', () => {
  let controller: DireccionesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DireccionesController],
      providers: [
        DireccionesService,
        {
          provide: PrismaService,
          useValue: {
            // Mock del PrismaService
            direcciones: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    controller = module.get<DireccionesController>(DireccionesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
