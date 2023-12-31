import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { v4 as uuidv4 } from 'uuid';
import { SignupDto } from '../src/auth/dto/signup.dto';
import { SigninDto } from '../src/auth/dto/signin.dto';
import {
  randEmail,
  randPhoneNumber,
  randFirstName,
  randLastName,
  randUserName,
  randPassword,
  randProductCategory,
} from '@ngneat/falso';
import { faker } from '@faker-js/faker';
import { CreateCompanyDto } from '../src/company/dto/create-company.dto';

const generateRandomSignupDto = (): SignupDto => ({
  email: randEmail(),
  password: randPassword(),
  nickName: randUserName(),
  firstName: randFirstName(),
  lastName: randLastName(),
  phoneNumber: randPhoneNumber(),
  description: faker.lorem.sentence(),
  position: faker.lorem.sentence(),
});

const generateRandomCompanyDto = (): CreateCompanyDto => ({
  name: faker.company.buzzPhrase(),
  address: faker.location.streetAddress(),
  serviceOfActivity: faker.company.buzzNoun(),
  numberOfEmployees: faker.number.int({ min: 1, max: 100000 }),
  description: faker.lorem.sentence(),
  type: randProductCategory(),
});

describe('App Tests (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/signup (POST)', async () => {
    const signupDto: SignupDto = generateRandomSignupDto();

    const response = await request(app.getHttpServer())
      .post('/signup')
      .send(signupDto)
      .expect(HttpStatus.CREATED);

    expect(response.body.id).toBeDefined();
    expect(response.body.email).toBe(signupDto.email);

    expect(response.body.password).toBeUndefined();
  });

  it('/signup (POST) - User email already exists', async () => {
    const signupDto: SignupDto = generateRandomSignupDto();

    const response = await request(app.getHttpServer())
      .post('/signup')
      .send(signupDto)
      .expect(HttpStatus.CREATED);

    const responseForExisting = await request(app.getHttpServer())
      .post('/signup')
      .send(signupDto)
      .expect(HttpStatus.BAD_REQUEST);

    expect(responseForExisting.body.message).toBe(
      'User with given email already exists.',
    );
  });

  it('/signup (POST) - User nickName already exists', async () => {
    const signupDto: SignupDto = generateRandomSignupDto();

    const response = await request(app.getHttpServer())
      .post('/signup')
      .send(signupDto)
      .expect(HttpStatus.CREATED);

    const signupDtoSameNick: SignupDto = {
      ...generateRandomSignupDto(),
      nickName: signupDto.nickName,
    };

    const responseForExisting = await request(app.getHttpServer())
      .post('/signup')
      .send(signupDtoSameNick)
      .expect(HttpStatus.BAD_REQUEST);

    expect(responseForExisting.body.message).toBe(
      'User with given nickname already exists.',
    );
  });

  it('/signin (POST) - Successful signin', async () => {
    const signupDto: SignupDto = generateRandomSignupDto();

    const responseCreateUser = await request(app.getHttpServer())
      .post('/signup')
      .send(signupDto)
      .expect(HttpStatus.CREATED);

    const signinDto: SigninDto = {
      email: signupDto.email,
      password: signupDto.password,
    };

    const response = await request(app.getHttpServer())
      .post('/signin')
      .send(signinDto)
      .expect(HttpStatus.OK);

    expect(response.body.access_token).toBeDefined();

    const profileResponse = await request(app.getHttpServer())
      .get('/profile')
      .set('Authorization', `Bearer ${response.body.access_token}`)
      .expect(HttpStatus.OK);

    expect(profileResponse.body.id).toBeDefined();
    expect(profileResponse.body.email).toBe(signupDto.email);
  });

  it('/signin (POST) - Invalid credentials', async () => {
    const signinDto: SigninDto = {
      email: 'nonexistent@example.com',
      password: 'invalidpassword',
    };

    const response = await request(app.getHttpServer())
      .post('/signin')
      .send(signinDto)
      .expect(HttpStatus.UNAUTHORIZED);

    expect(response.body.message).toBe('Invalid credentials');
  });

  it('/profile (GET) - Successful profile retrieval', async () => {
    const signupDto: SignupDto = generateRandomSignupDto();

    const responseCreateUser = await request(app.getHttpServer())
      .post('/signup')
      .send(signupDto)
      .expect(HttpStatus.CREATED);

    const signinDto: SigninDto = {
      email: signupDto.email,
      password: signupDto.password,
    };

    const response = await request(app.getHttpServer())
      .post('/signin')
      .send(signinDto)
      .expect(HttpStatus.OK);

    const profileResponse = await request(app.getHttpServer())
      .get('/profile')
      .set('Authorization', `Bearer ${response.body.access_token}`)
      .expect(HttpStatus.OK);

    expect(profileResponse.body.id).toBeDefined();
    expect(profileResponse.body.email).toBeDefined();
    expect(profileResponse.body.phoneNumber).toBeDefined();
    expect(profileResponse.body.lastName).toBeDefined();
    expect(profileResponse.body.firstName).toBeDefined();
    expect(profileResponse.body.nickName).toBeDefined();
    expect(profileResponse.body.description).toBeDefined();
    expect(profileResponse.body.position).toBeDefined();
    expect(profileResponse.body.createdAt).toBeDefined();
    expect(profileResponse.body.updatedAt).toBeDefined();

    expect(profileResponse.body.password).toBeUndefined();
  });

  it('/profile (GET) - Unauthorized without token', async () => {
    const response = await request(app.getHttpServer())
      .get('/profile')
      .expect(HttpStatus.UNAUTHORIZED);

    expect(response.body.message).toBe('Unauthorized');
  });
});

describe('Company Tests (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const signupDto: SignupDto = generateRandomSignupDto();

    await request(app.getHttpServer())
      .post('/signup')
      .send(signupDto)
      .expect(HttpStatus.CREATED);

    const signinDto: SigninDto = {
      email: signupDto.email,
      password: signupDto.password,
    };

    const signinResponse = await request(app.getHttpServer())
      .post('/signin')
      .send(signinDto)
      .expect(HttpStatus.OK);

    accessToken = signinResponse.body.access_token;
  });

  afterEach(async () => {
    await app.close();
  });

  it('/company (POST) - Successful company creation', async () => {
    const companyDto = generateRandomCompanyDto();

    const response = await request(app.getHttpServer())
      .post('/company')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(companyDto)
      .expect(HttpStatus.CREATED);

    expect(response.body.id).toBeDefined();
    expect(response.body.name).toBe(companyDto.name);
  });

  it('/company (POST) - Unauthorized without token', async () => {
    const companyDto = generateRandomCompanyDto();

    const response = await request(app.getHttpServer())
      .post('/company')
      .send(companyDto)
      .expect(HttpStatus.UNAUTHORIZED);

    expect(response.body.message).toBe('Unauthorized');
  });

  ////////

  it('/company (POST) - Validation error on missing fields', async () => {
    const invalidCompanyDto = {
      // Missing required fields
    };

    const response = await request(app.getHttpServer())
      .post('/company')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(invalidCompanyDto)
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('/company (POST) - Validation error on invalid number of employees', async () => {
    const invalidCompanyDto = {
      ...generateRandomCompanyDto(),
      numberOfEmployees: 'invalid', // Invalid number format
    };

    const response = await request(app.getHttpServer())
      .post('/company')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(invalidCompanyDto)
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('/companies (GET) - Get all companies', async () => {
    // Create companies for testing

    const companiesList = [];

    const amount = 500;

    for (let i = 0; i < amount; i++) {
      const promise = await request(app.getHttpServer())
        .post('/company')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(generateRandomCompanyDto())
        .expect(HttpStatus.CREATED);

      companiesList.push(promise);
    }

    const response = await request(app.getHttpServer())
      .post('/companies')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(HttpStatus.OK);

    expect(response.body).toHaveLength(amount);
  }, 100000);

  //
  //
  //
  //
  //

  it('/company/:id (GET) - Get a specific company by ID', async () => {
    const companyDto = generateRandomCompanyDto();

    // Create a new company
    const createResponse = await request(app.getHttpServer())
      .post('/company')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(companyDto)
      .expect(HttpStatus.CREATED);

    const companyId = createResponse.body.id;

    // Retrieve the created company by ID
    const getResponse = await request(app.getHttpServer())
      .get(`/company/${companyId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(HttpStatus.OK);

    expect(getResponse.body.id).toBe(companyId);
    expect(getResponse.body.name).toBe(companyDto.name);
    expect(getResponse.body.user).toBeDefined();
    expect(getResponse.body.user.password).toBeUndefined();
  });

  it('/company/:id (GET) - Unauthorized without token', async () => {
    const companyDto = generateRandomCompanyDto();

    const createResponse = await request(app.getHttpServer())
      .post('/company')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(companyDto)
      .expect(HttpStatus.CREATED);

    const companyId = createResponse.body.id;

    const getResponse = await request(app.getHttpServer())
      .get(`/company/${companyId}`)
      .expect(HttpStatus.UNAUTHORIZED);

    expect(getResponse.body.message).toBe('Unauthorized');
  });

  it("/company/:id (GET) - Forbidden when trying to access another user's company", async () => {
    const companyDto = generateRandomCompanyDto();

    const createResponse = await request(app.getHttpServer())
      .post('/company')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(companyDto)
      .expect(HttpStatus.CREATED);

    const companyId = createResponse.body.id;

    // Sign in with a new user
    const anotherUserSignupDto: SignupDto = generateRandomSignupDto();

    await request(app.getHttpServer())
      .post('/signup')
      .send(anotherUserSignupDto)
      .expect(HttpStatus.CREATED);

    const anotherUserSigninDto: SigninDto = {
      email: anotherUserSignupDto.email,
      password: anotherUserSignupDto.password,
    };

    const anotherUserSigninResponse = await request(app.getHttpServer())
      .post('/signin')
      .send(anotherUserSigninDto)
      .expect(HttpStatus.OK);

    const anotherUserAccessToken = anotherUserSigninResponse.body.access_token;

    // Try to retrieve the created company by ID with the new user's token
    const getResponse = await request(app.getHttpServer())
      .get(`/company/${companyId}`)
      .set('Authorization', `Bearer ${anotherUserAccessToken}`)
      .expect(HttpStatus.FORBIDDEN);

    expect(getResponse.body.message).toBe(
      'You do not have permission to get this entity',
    );
  });

  it('/company (PATCH) - Update a specific company by ID', async () => {
    const companyDto = generateRandomCompanyDto();

    const createResponse = await request(app.getHttpServer())
      .post('/company')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(companyDto)
      .expect(HttpStatus.CREATED);

    const companyId = createResponse.body.id;

    const updatedCompanyDto = {
      ...createResponse.body,
      name: 'Updated Company Name',
    };

    const patchResponse = await request(app.getHttpServer())
      .patch(`/company`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(updatedCompanyDto)
      .expect(HttpStatus.OK);

    expect(patchResponse.body.id).toBe(companyId);
    expect(patchResponse.body.name).toBe(updatedCompanyDto.name);
  });

  it('/company (PATCH) - Unauthorized without token', async () => {
    const companyDto = generateRandomCompanyDto();

    const createResponse = await request(app.getHttpServer())
      .post('/company')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(companyDto)
      .expect(HttpStatus.CREATED);

    const companyId = createResponse.body.id;

    const updatedCompanyDto = {
      ...createResponse.body,
      name: 'Updated Company Name',
    };

    const patchResponse = await request(app.getHttpServer())
      .patch(`/company`)
      .send(updatedCompanyDto)
      .expect(HttpStatus.UNAUTHORIZED);

    expect(patchResponse.body.message).toBe('Unauthorized');
  });

  it("/company (PATCH) - Forbidden when trying to update another user's company", async () => {
    const companyDto = generateRandomCompanyDto();

    const createResponse = await request(app.getHttpServer())
      .post('/company')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(companyDto)
      .expect(HttpStatus.CREATED);

    const companyId = createResponse.body.id;

    const anotherUserSignupDto: SignupDto = generateRandomSignupDto();

    await request(app.getHttpServer())
      .post('/signup')
      .send(anotherUserSignupDto)
      .expect(HttpStatus.CREATED);

    const anotherUserSigninDto: SigninDto = {
      email: anotherUserSignupDto.email,
      password: anotherUserSignupDto.password,
    };

    const anotherUserSigninResponse = await request(app.getHttpServer())
      .post('/signin')
      .send(anotherUserSigninDto)
      .expect(HttpStatus.OK);

    const anotherUserAccessToken = anotherUserSigninResponse.body.access_token;

    const updatedCompanyDto = {
      ...createResponse.body,
      name: 'Updated Company Name',
    };

    const patchResponse = await request(app.getHttpServer())
      .patch(`/company`)
      .set('Authorization', `Bearer ${anotherUserAccessToken}`)
      .send(updatedCompanyDto)
      .expect(HttpStatus.FORBIDDEN);

    expect(patchResponse.body.message).toBe(
      'You do not have permission to update this entity',
    );
  });

  it('/company/:id (DELETE) - Delete a specific company by ID', async () => {
    const companyDto = generateRandomCompanyDto();

    // Create a new company
    const createResponse = await request(app.getHttpServer())
      .post('/company')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(companyDto)
      .expect(HttpStatus.CREATED);

    const companyId = createResponse.body.id;

    // Delete the created company by ID
    await request(app.getHttpServer())
      .delete(`/company/${companyId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(HttpStatus.NO_CONTENT);

    // Verify the company is deleted
    await request(app.getHttpServer())
      .get(`/company/${companyId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(HttpStatus.NOT_FOUND);
  });
});
