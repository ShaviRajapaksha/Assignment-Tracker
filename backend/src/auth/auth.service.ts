import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService
    ) {}

    generateToken(userId: string, email: string) {
        return this.jwtService.sign({sub: userId, email});
    }

    async register(registerDto: RegisterDto) {
        const existingUser = await this.prisma.user.findUnique({
            where: {email: registerDto.email}
        });
        if (existingUser) {
            throw new ConflictException('Email already in use');
        }
        const hashedPassword = await bcrypt.hash(registerDto.password, 10);
        const user = await this.prisma.user.create({
            data: {
                email: registerDto.email,
                name: registerDto.name,
                password: hashedPassword
            }
        });
        const token = this.generateToken(user.id, user.email)

        return {
            user: {id: user.id, email: user.email, name: user.name},
            token
        }
    }

    async login(loginDto: LoginDto) {
        const user = await this.prisma.user.findUnique({
            where: {email: loginDto.email}
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const token = this.generateToken(user.id, user.email);

        return {
            user: {id: user.id, email: user.email, name: user.name},
            token
        }
    }

    async validateUser(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: {id: userId},
            select: {id: true, email: true, name: true}
        });
    }
}
