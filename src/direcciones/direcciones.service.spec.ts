import { Test, TestingModule } from '@nestjs/testing';
import { DireccionesService } from './direcciones.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DireccionesService', () => {
  let service: DireccionesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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

    service = module.get<DireccionesService>(DireccionesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
