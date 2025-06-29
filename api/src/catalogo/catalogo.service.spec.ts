import { Test, TestingModule } from '@nestjs/testing';
import { CatalogoService } from './catalogo.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CatalogoService', () => {
  let service: CatalogoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CatalogoService, PrismaService],
    }).compile();

    service = module.get<CatalogoService>(CatalogoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
