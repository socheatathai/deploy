import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersMemoryStorage } from './users-memory-storage/users-memory.storage';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env.local',
    }),
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService, UsersMemoryStorage],
})
export class AppModule {}
