import { BaseError } from './BaseError'

export class SessionExpired extends BaseError {
  constructor() {
    super('Your session has expired. Please reload the page.', 'info')
  }
}
