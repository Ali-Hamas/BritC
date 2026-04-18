/**
 * Utility service for handling file uploads and content extraction 
 */
export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  previewUrl?: string;
  content?: string; // Extracted text content for searchable context
}

export class FileHandlingService {
  /**
   * Processes a File object into a FileAttachment object
   */
  static async processFile(file: File): Promise<FileAttachment> {
    const id = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const attachment: FileAttachment = {
      id,
      name: file.name,
      type: file.type,
      size: file.size,
    };

    // Generate preview for images
    if (file.type.startsWith('image/')) {
      attachment.previewUrl = await this.getFilePreview(file);
    }

    // Extract text for relevant file types
    if (this.isTextBased(file.name, file.type)) {
      attachment.content = await this.readAsText(file);
    }

    return attachment;
  }

  /**
   * Generates a data URL preview for an image
   */
  private static getFilePreview(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  }

  /**
   * Reads a file as plain text
   */
  private static readAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || '');
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  }

  /**
   * Checks if a file is text-based and its content can be extracted
   */
  private static isTextBased(filename: string, type: string): boolean {
    const textTypes = ['text/plain', 'text/markdown', 'text/csv', 'application/json'];
    const extensions = ['.txt', '.md', '.csv', '.json', '.ts', '.tsx', '.js', '.jsx'];
    
    return textTypes.includes(type) || extensions.some(ext => filename.toLowerCase().endsWith(ext));
  }

  /**
   * Formats file size into human-readable string
   */
  static formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
