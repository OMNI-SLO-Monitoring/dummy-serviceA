import { Injectable, HttpService } from '@nestjs/common';

const urlMonitor = 'http://localhost:3000/'
const urlServiceB = 'http://localhost:3002/'

@Injectable()
export class AppService {
  constructor(private httpService: HttpService) {}
  
  createErrorMessage(data: string) {
    let string = '{ "data": ' + JSON.stringify(data) + ', "level": "error"}'
    console.log(string)
    return JSON.parse(string)
  }

  async sendError(data: JSON) {
    const send = await this.httpService.post(urlMonitor, data).toPromise();
  }

  async sendToB() {
    try {
      const send = await this.httpService.get(urlServiceB).toPromise();
      if (send.status == 200) {
        console.log('Request to B was successful')
      }
    } catch (error) {
      this.sendError(error.response.data)
    }
  }

}
