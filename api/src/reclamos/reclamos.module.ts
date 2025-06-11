import { Module } from '@nestjs/common';
import { ReclamosService } from './reclamos.service';
import { ReclamosController } from './reclamos.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ReclamosController],
  providers: [ReclamosService],
  exports: [ReclamosService],
})
export class ReclamosModule {}
