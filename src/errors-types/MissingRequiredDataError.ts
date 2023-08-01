import { BaseError } from './BaseError'

export class MissingRequiredDataError extends BaseError {
  constructor(message: string) {
    super(message, 'error')
  }
}
