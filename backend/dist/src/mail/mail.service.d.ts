import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export interface OutgoingMail {
    to: string;
    subject: string;
    text: string;
    html?: string;
}
export declare class MailService implements OnModuleInit {
    private readonly config;
    private readonly logger;
    private transporter?;
    private from?;
    constructor(config: ConfigService);
    private getTransporter;
    private required;
    onModuleInit(): Promise<void>;
    send(mail: OutgoingMail): Promise<boolean>;
}
