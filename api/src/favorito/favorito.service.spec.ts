import { Test, TestingModule } from '@nestjs/testing';
import { FavoritosService } from './favoritos.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FavoritoService', () => {
  let service: FavoritosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FavoritosService, PrismaService],
    }).compile();

    service = module.get<FavoritosService>(FavoritosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
