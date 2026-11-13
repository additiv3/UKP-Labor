import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * Liste und Detail: am Handy entweder Liste oder Detail, ab 900 px nebeneinander.
 */
export function MasterDetail({ list, detail, showDetail }: { list: ReactNode; detail: ReactNode; showDetail: boolean }) {
  return (
    <div className={`md ${showDetail ? 'md-detail' : 'md-list'}`}>
      <div className="md-master">{list}</div>
      <div className="md-pane">{detail}</div>
    </div>
  );
}

export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link className="back-link" to={to}>
      ‹ {label}
    </Link>
  );
}
