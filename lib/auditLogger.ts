import { NextApiRequest } from 'next';
import AuditLog from '@/models/AuditLog';
import { TokenPayload } from '@/lib/auth';

export interface AuditLogData {
  action: string;
  resource: string;
  resourceId?: string;
  details?: string;
}

export const logActivity = async (
  user: TokenPayload,
  data: AuditLogData,
  req?: NextApiRequest
): Promise<void> => {
  try {
    const auditLog = new AuditLog({
      userId: user.userId,
      userRole: user.role,
      action: data.action,
      resource: data.resource,
      resourceId: data.resourceId,
      details: data.details,
      ipAddress: req ? getClientIP(req) : undefined,
      userAgent: req ? req.headers['user-agent'] : undefined
    });

    await auditLog.save();
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw error to avoid breaking the main operation
  }
};

const getClientIP = (req: NextApiRequest): string => {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    (req.headers['x-real-ip'] as string) ||
    req.connection?.remoteAddress ||
    'unknown'
  );
};
