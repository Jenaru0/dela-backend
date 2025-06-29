import { Module } from '@nestjs/common';
import { ResenasService } from './resenas.service';
import { ResenasController } from './resenas.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ResenasController],
  providers: [ResenasService],
  exports: [ResenasService],
})
export class ResenasModule {}
