import { Test, TestingModule } from '@nestjs/testing';
import { CategoriaService } from './categoria.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CategoriaService', () => {
  let service: CategoriaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoriaService, PrismaService], // <--- agregas PrismaService aquí
    }).compile();

    service = module.get<CategoriaService>(CategoriaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
