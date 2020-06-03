import { Injectable, HttpService } from '@nestjs/common';
import { Policy, ConsecutiveBreaker, BrokenCircuitError } from 'cockatiel';

const urlMonitor = 'http://localhost:3400/';
const urlServiceB = 'http://localhost:3000/';
const circuitBreaker = Policy.handleAll().circuitBreaker(
  10 * 1000,
  new ConsecutiveBreaker(3),
);

@Injectable()
export class AppService {
  constructor(private httpService: HttpService) {}

  createErrorMessage(data: string) {
    let string = '{ "data": ' + JSON.stringify(data) + ', "level": "error"}';
    console.log(string);
    return JSON.parse(string);
  }

  async handleRequest() {
    try {
      const data = await circuitBreaker.execute(() => this.sendToB());
    } catch (error) {
      if (error instanceof BrokenCircuitError) {
        console.log('Breaker open');
        this.sendError(
          JSON.parse(
            '{ "data": "CircuitBreaker open", "level": "CircuitBreakerError"}',
          ),
        );
      } else {
        console.log(error);
        this.sendError(error);
      }
    }
  }

  sendError(data: JSON) {
    this.httpService.post(urlMonitor, data).subscribe(
      res => console.log(`Report sent to monitor at ${urlMonitor}`),
      err => console.log(`Monitor at ${urlMonitor} not available`),
    );
  }

  async sendToB() {
    console.log('B called');
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
