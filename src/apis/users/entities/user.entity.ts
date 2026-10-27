import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from 'src/common/database/entities/base.entity';
import { ROLE } from 'src/common/enum';

@Entity('users')
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 200 })
  email: string;

  /** Never returned by default queries; load explicitly with addSelect/select for login */
  @Column({ name: 'password_hash', type: 'varchar', length: 100, select: false })
  passwordHash: string;

  @Column({ type: 'varchar', length: 20, default: ROLE.SALE })
  role: ROLE;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;
}
