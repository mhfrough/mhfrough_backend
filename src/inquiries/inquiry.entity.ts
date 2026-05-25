import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn,
} from 'typeorm';

export enum InquiryStatus {
  NEW = 'new',
  READ = 'read',
  REPLIED = 'replied',
}

@Entity('inquiries')
export class Inquiry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  subject: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'enum', enum: InquiryStatus, default: InquiryStatus.NEW })
  status: InquiryStatus;

  @CreateDateColumn()
  createdAt: Date;
}
