import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Api } from './services/api';
import { Auth } from './services/auth';
import { Storage } from './services/storage';

@NgModule({
  imports: [CommonModule],
  exports: [CommonModule],
  providers: [Api, Auth, Storage],
})
export class CoreModule {}
