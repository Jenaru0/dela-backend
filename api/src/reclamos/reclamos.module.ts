import { Module } from '@nestjs/common';
import { ReclamosService } from './reclamos.service';
import { ReclamosController } from './reclamos.controller';

@Module({
  controllers: [ReclamosController],
  providers: [ReclamosService],
  exports: [ReclamosService],
})
export class ReclamosModule {}
