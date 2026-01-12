-- Adicionar coluna de imagem
ALTER TABLE products 
ADD COLUMN image_url TEXT;

COMMENT ON COLUMN products.image_url IS 'URL da imagem do produto (opcional)';
