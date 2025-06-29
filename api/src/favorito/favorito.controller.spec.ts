import { Test, TestingModule } from '@nestjs/testing';
import { FavoritosController } from './favoritos.controller';
import { FavoritosService } from './favoritos.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FavoritoController', () => {
  let controller: FavoritosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FavoritosController],
      providers: [FavoritosService, PrismaService],
    }).compile();

    controller = module.get<FavoritosController>(FavoritosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
