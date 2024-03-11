import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { mkdirSync, existsSync } from 'fs';
import * as path from 'path';
import { Logger } from '@nestjs/common';

@Injectable()
export class FileSystemService {
  private readonly logger = new Logger(FileSystemService.name);

  private readonly baseStoragePath = path.join(process.cwd(), 'data');

  getStoragePath(filename: string): string {
    if (!existsSync(this.baseStoragePath)) {
      mkdirSync(this.baseStoragePath);
    }
    return path.join(this.baseStoragePath, filename);
  }

  async saveFile(file: Express.Multer.File): Promise<string> {
    try {
      await fs.writeFile(this.getStoragePath(file.originalname), file.buffer);
      this.logger.log(`file saved successfully into ${this.getStoragePath(file.originalname)}`);
      return this.getStoragePath(file.originalname);
    } catch (e) {
      this.logger.error('error saving file', e);
    }
  }

  async deleteFile(filename: string): Promise<void> {
    try {
      await fs.unlink(this.getStoragePath(filename));
      this.logger.log(`file ${filename} deleted successfully`);
    } catch (e) {
      this.logger.error('error deleting file', e);
    }
  }
}
