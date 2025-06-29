import { Test, TestingModule } from '@nestjs/testing';
import { CatalogoController } from './catalogo.controller';
import { CatalogoService } from './catalogo.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CatalogoController', () => {
  let controller: CatalogoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CatalogoController],
      providers: [CatalogoService, PrismaService],
    }).compile();

    controller = module.get<CatalogoController>(CatalogoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
