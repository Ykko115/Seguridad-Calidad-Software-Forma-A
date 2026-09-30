# Etapa 1: Construcción
FROM node:20 AS builder

WORKDIR /app

# Argumento para la URL de la API
ARG VITE_API_URL=http://localhost:4000

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias (npm ci es más rápido y reproduce el lock file)
RUN npm ci && \
    npm install @rollup/rollup-linux-x64-gnu --save-optional

# Copiar código fuente
COPY . .

# Establecer variable de entorno para el build
ENV VITE_API_URL=${VITE_API_URL}

# Construir la aplicación
RUN npm run build

# Etapa 2: Producción
FROM nginx:alpine

# Copiar los archivos construidos desde la etapa de construcción
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuración de nginx personalizada
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer puerto 80
EXPOSE 80

# Comando para iniciar nginx
CMD ["nginx", "-g", "daemon off;"]

