import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UsersService } from './users.service';
import { SupabaseStorageModule } from '../supabase-storage/supabase-storage.module';

@Module({
    imports: [TypeOrmModule.forFeature([User]), SupabaseStorageModule],
    providers: [UsersService],
    exports: [UsersService],
})
export class UsersModule { }
