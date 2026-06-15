import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
const app = await NestFactory.create(AppModule);
app.enableShutdownHooks();

// CORS — support multiple origins via comma-separated FRONTEND_URL
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
.split(',')
.map((o) => o.trim());

app.enableCors({
origin: (origin, callback) => {
if (!origin || allowedOrigins.includes(origin)) {
callback(null, origin || allowedOrigins[0]);
} else {
callback(new Error('Not allowed by CORS'));
}
},
credentials: true,
});

// Global validation pipe
app.useGlobalPipes(
new ValidationPipe({
whitelist: true,
transform: true,
forbidNonWhitelisted: true,
}),
);

// API prefix
app.setGlobalPrefix('api');

// Swagger docs
if (process.env.NODE_ENV !== 'production') {
const config = new DocumentBuilder()
.setTitle('BRACKET API')
.setDescription('Range Prediction Market — API Documentation')
.setVersion('1.0')
.addBearerAuth()
.build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
}

const port = process.env.PORT || 3001;
await app.listen(port);
console.log(`🚀 BRACKET API running on port ${port}`);
}

bootstrap();
