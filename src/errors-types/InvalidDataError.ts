import { BaseError } from './BaseError'

type InvalidDataType = {
  isInvalid: boolean
  [key: string]: any
}

export class InvalidDataError extends BaseError {
  constructor(data: InvalidDataType[]) {
    const invalids = Object.entries(data)
      .reduce((acc, [key, value]) => {
        if (value.isInvalid) {
          acc.push(key)
        }

        return acc
      }, [] as string[])
      .join(', ')

    super(`Invalid data for: ${invalids}`, 'error')
  }
}
