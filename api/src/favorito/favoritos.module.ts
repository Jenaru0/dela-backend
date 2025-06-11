import { Module } from '@nestjs/common';
import { FavoritosService } from './favoritos.service';
import { FavoritosController } from './favoritos.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [FavoritosController],
  providers: [FavoritosService, PrismaService],
  exports: [FavoritosService],
})
export class FavoritosModule {}
