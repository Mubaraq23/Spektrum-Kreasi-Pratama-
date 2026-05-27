import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';

export async function logAction(
  action: string, 
  moduleName: string, 
  details: string, 
  severity: 'info' | 'warning' | 'critical' = 'info'
) {
  try {
    const user = auth.currentUser;
    const operatorId = user?.uid || 'anonymous';
    const operatorName = user?.displayName || user?.email?.split('@')[0] || 'Sistem';
    
    await addDoc(collection(db, 'auditLogs'), {
      operatorId,
      operatorName,
      action,
      module: moduleName,
      details,
      severity,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to log audit action:', error);
  }
}

export async function pushNotification(
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
  targetUid: string = 'all',
  link: string = ''
) {
  try {
    await addDoc(collection(db, 'notifications'), {
      title,
      message,
      type,
      targetUid,
      read: false,
      createdAt: serverTimestamp(),
      link
    });
  } catch (error) {
    console.error('Failed to push notification:', error);
  }
}
