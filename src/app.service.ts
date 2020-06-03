import { Injectable, HttpService } from '@nestjs/common';

import { Policy, ConsecutiveBreaker, BrokenCircuitError, TimeoutStrategy, TaskCancelledError, CancellationToken } from 'cockatiel';

const urlMonitor = 'http://localhost:3400/';
const urlServiceB = 'http://localhost:3000/';
const circuitBreaker = Policy.handleAll().circuitBreaker(
  10 * 1000,
  new ConsecutiveBreaker(3),
);

const timeout = Policy.timeout(3000, TimeoutStrategy.Aggressive);

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
      const data = await circuitBreaker.execute(() => this.handleTimeout());
    } catch (error) {
      if (error instanceof BrokenCircuitError) {
        console.log('Breaker open');
        this.sendError(
          JSON.parse(
            '{ "data": "CircuitBreaker open", "level": "circuit_breaker_error"}',
          ),
        );
        //skip TaskCancelledError to not send twice
      } else if (error instanceof TaskCancelledError) {
        
      } else {
        console.log(error.response.status);
        console.log(error.response.statusText);
        let string = error.response.status + ' ' + error.response.statusText;
        this.sendError(this.createErrorMessage(string));
      }
    }
  }

  sendError(data: JSON) {
    this.httpService.post(urlMonitor, data).subscribe(
      res => console.log(`Report sent to monitor at ${urlMonitor}`),
      err => console.log(`Monitor at ${urlMonitor} not available`),
    );
  }

  async handleTimeout() {
    try {
      const data =await timeout.execute(() => this.sendToB())
    } catch (error) {
        if (error instanceof TaskCancelledError) {
          console.log('Request timeout')
          this.sendError(
            JSON.parse(
              '{ "data": "CircuitBreaker timeout", "level": "circuit_breaker_error"}',
              ),
          );
          return Promise.reject(error);
        } else {
          return Promise.reject(error);
        }
    }
  }
  async handleRequestToB() {
    const breaker = new Circuitbreaker(this.sendToB(), options);
    const response = await breaker.fire().catch(console.error);
    console.log('After catch');
    breaker.fallback(response => this.sendError(response.data));
  }
  async sendToB() {
    console.log('B called');
    try {
      const send = await this.httpService.get(urlServiceB).toPromise();
      if (send.status == 200) {
        console.log('Request to B was successful');
      }
    } catch (error) {
      //console.log(error);
      return Promise.reject(error);
    }
  }
}
