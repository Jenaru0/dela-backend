import { PartialType } from '@nestjs/mapped-types';
import { CreatePromocionDto } from './crear-promocion.dto';

export class UpdatePromocionDto extends PartialType(CreatePromocionDto) {}
