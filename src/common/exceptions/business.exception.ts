import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode, ErrorMessages } from '../enums/error-codes.enum';

export class BusinessException extends HttpException {
  constructor(errorCode: ErrorCode, customMessage?: string, data?: any) {
    const message = customMessage || ErrorMessages[errorCode] || '未知错误';

    super(
      {
        code: errorCode,
        message,
        data,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
