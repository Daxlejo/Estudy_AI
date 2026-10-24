import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /** Liveness probe used by the Electron shell (`GET /api/health`). Unauthenticated. */
  @Get('health')
  getHealth(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
