import React, { useEffect, useState } from 'react';
import { resolveProductImage } from '../../lib/productImage';

interface ProductImageProps {
  src?: string | null;
  alt: string;
  category?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}

/** Product photo with category fallback when URL is missing or 404s. */
export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  category,
  className = '',
  loading = 'lazy',
}) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [src, category]);
  const resolved = resolveProductImage(failed ? null : src, category);

  return (
    <img
      src={resolved}
      alt={alt}
      loading={loading}
      referrerPolicy="no-referrer"
      onError={() => {
        if (!failed) setFailed(true);
      }}
      className={className}
    />
  );
};
