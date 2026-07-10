import { Request } from 'express';
import { WidgetSessionPayload } from './widget-session-payload.interface';

export interface RequestWithWidgetSession extends Request {
  widgetSession: WidgetSessionPayload;
}
