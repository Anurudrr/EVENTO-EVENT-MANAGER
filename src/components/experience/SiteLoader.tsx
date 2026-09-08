import React, { useEffect, useState } from 'react';

const STORAGE_KEY = 'evento.loader.seen';
const MAX_LOADER_DURATION_MS = 220;

export const SiteLoader: React.FC = React.memo(() => {
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }

    try {
      return window.sessionStorage.getItem(STORAGE_KEY) !== '1'
        && document.readyState !== 'complete';
    } catch {
      return document.readyState !== 'complete';
    }
  });

  useEffect(() => {
    if (!visible || typeof window === 'undefined') {
      return undefined;
    }

    let fallbackTimer = 0;

    document.body.classList.add('overflow-hidden');

    const finish = () => {
      window.requestAnimationFrame(() => {
        try {
          window.sessionStorage.setItem(STORAGE_KEY, '1');
        } catch {
          // sessionStorage disabled or unavailable
        }
        document.body.classList.remove('overflow-hidden');
        setVisible(false);
      });
    };

    if (document.readyState === 'complete') {
      finish();
    } else {
      window.addEventListener('load', finish, { once: true });
    }

    fallbackTimer = window.setTimeout(finish, MAX_LOADER_DURATION_MS);

    return () => {
      window.removeEventListener('load', finish);
      window.clearTimeout(fallbackTimer);
      document.body.classList.remove('overflow-hidden');
    };
  }, [visible]);

  return (
    <>
      {visible ? (
        <div className="site-loader">
          <div className="site-loader__grain" />
          <div className="site-loader__content">
            <span className="site-loader__eyebrow">Live marketplace for event experiences</span>
            <div className="site-loader__title">
              <span>EVENTO</span>
              <span>EVENTO</span>
            </div>
            <div className="site-loader__bar">
              <span />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
});

SiteLoader.displayName = 'SiteLoader';
