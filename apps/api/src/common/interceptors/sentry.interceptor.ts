import {
  ExecutionContext,
  Injectable,
  NestInterceptor,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import * as Sentry from '@sentry/nestjs';

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        // We only want to log unexpected errors (5xx) to Sentry.
        // 4xx errors are usually client-side issues and we don't want to noise Sentry with them.
        const status =
          error instanceof HttpException
            ? error.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;

        if (status >= 500) {
          Sentry.withScope((scope) => {
            const request = context.switchToHttp().getRequest();
            scope.setTag('url', request.url);
            scope.setTag('method', request.method);
            
            const controllerName = context.getClass().name;
            const methodName = context.getHandler().name;
            scope.setTag('controller', controllerName);
            scope.setTag('method_name', methodName);

            Sentry.captureException(error);
          });
        }

        return throwError(() => error);
      }),
    );
  }
}
