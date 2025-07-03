import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { JwtAutenticacionGuard } from './autenticacion/guards/jwt-autenticacion.guard';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'dela-platform-api',
      version: '1.0.0',
    };
  }

  @Get('dashboard/activity')
  @UseGuards(JwtAutenticacionGuard)
  async getRecentActivity() {
    return this.appService.getRecentActivity();
  }

  @Get('dashboard/stats')
  @UseGuards(JwtAutenticacionGuard)
  async getDashboardStats() {
    return this.appService.getDashboardStats();
  }

  @Get('dashboard/alerts')
  @UseGuards(JwtAutenticacionGuard)
  async getCriticalAlerts() {
    return this.appService.getCriticalAlerts();
  }

  @Get('dashboard/sales')
  @UseGuards(JwtAutenticacionGuard)
  async getSalesOverview(@Query('period') period?: string) {
    return this.appService.getSalesOverview(period || 'week');
  }
}
