import { Module } from '@nestjs/common';
import { FirebaseStorageService } from './firebase-storage.service';

@Module({
    providers: [FirebaseStorageService],
    exports: [FirebaseStorageService],
})
export class FirebaseStorageModule { }
