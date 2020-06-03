import { Injectable, HttpService } from '@nestjs/common';
import * as Circuitbreaker from 'opossum';
const urlMonitor = 'http://localhost:3400/';
const urlServiceB = 'http://localhost:3000/';

const options = {
  timeout: 3000,
  resetTimeout: 10000,
};
const circuitBreakerError = JSON.parse(
  '{"data": "CircuitBreaker open", "level": "circuitbreakerError"}',
);
@Injectable()
export class AppService {
  constructor(private httpService: HttpService) {}

  createErrorMessage(data: string) {
    let string = '{ "data": ' + JSON.stringify(data) + ', "level": "error"}';
    console.log(string);
    return JSON.parse(string);
  }

  async sendError(data: JSON) {
    const send = await this.httpService.post(urlMonitor, data).toPromise();
  }
  async handleRequestToB() {
    const breaker = new Circuitbreaker(this.sendToB(), options);
    const response = await breaker.fire().catch(console.error);
    console.log('After catch');
    breaker.fallback(response => this.sendError(response.data));
  }
  async sendToB() {
    try {
      const send = await this.httpService.get(urlServiceB).toPromise();
      if (send.status == 200) {
        console.log('Request to B was successful');
      }
    } catch (error) {
      return Promise.reject(error.response.data);
    }
  }
}
