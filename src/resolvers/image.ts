import {
  Resolver,
  Mutation,
  Arg,
  ObjectType,
  Field,
  UseMiddleware,
  Ctx,
  Query,
  Int,
  FieldResolver,
  Root
} from 'type-graphql';
import { GraphQLUpload, FileUpload } from 'graphql-upload';
import { createWriteStream } from 'fs';
import { Image } from '../entities/image';
import { User } from '../entities/user';
import { v4 } from 'uuid';
import path from 'path';
import { isAuth } from '../middleware/isAuthenticated';
import { MyContext } from '../types';
import { getConnection } from 'typeorm';

@ObjectType()
class ErrorField {
  @Field()
  field: string;
  @Field()
  message: string;
}

@ObjectType()
class UploadImageResponse {
  @Field(() => Image, { nullable: true })
  imageData?: Image;
  @Field(() => ErrorField, { nullable: true })
  error?: ErrorField;
}

@ObjectType()
class PaginatedImages {
  @Field(() => [Image])
  images: Image[];
  @Field()
  hasMore: boolean;
}

@Resolver(Image)
export class ImageResolver {
  @Mutation(() => UploadImageResponse)
  @UseMiddleware(isAuth)
  async uploadImage(
    @Arg('file', () => GraphQLUpload) { createReadStream, filename }: FileUpload,
    @Arg('caption') caption: string,
    @Ctx() { req }: MyContext
  ): Promise<UploadImageResponse> {
    return new Promise((resolve, reject) => {
      const { ext, name } = path.parse(filename);
      const imageFileName = `${name}-${v4()}-${Number(new Date())}${ext}`;

      const userId = req.session.userId;
      if (!caption || caption.length <= 3) {
        reject({ error: { field: 'caption', message: 'Title should be greater than 3!' } });
      }

      createReadStream()
        .pipe(
          createWriteStream(`${__dirname}/../../public/images/${imageFileName}`, {
            autoClose: true
          })
        )
        .on('finish', async () => {
          const post = await Image.create({
            userId,
            title: caption,
            url: `http://localhost:5000/images/${imageFileName}`
          }).save();
          resolve({ imageData: post });
        })
        .on('error', err => {
          reject({ error: { field: 'error', message: err.message } });
        });
    });
  }

  @Query(() => PaginatedImages)
  async getAllImages(
    @Arg('limit', () => Int) limit: number,
    @Arg('cursor', () => String, { nullable: true }) cursor: string | null,
    @Ctx() { req }: MyContext
  ): Promise<PaginatedImages> {
    const minLimit = Math.min(50, limit);
    const minLimitPlusOne = minLimit + 1;
    const userId = req.session.userId;
    const queryParams: any[] = [minLimitPlusOne];
    if (userId) {
      queryParams.push(userId);
    }
    let cursorId = 3;
    if (cursor) {
      queryParams.push(new Date(parseInt(cursor)));
      cursorId = queryParams.length;
    }
    const images = await getConnection().query(
      `
      select i.*, 
      ${
        userId
          ? '(select value from "like" where "userId" = $2 and "imageId" = i.id) "likeStatu"'
          : 'null as "likeStatu"'
      }
      from image i
      ${cursor ? `where i."createdAt" < $${cursorId}` : ''}
      order by i."createdAt" DESC
      limit $1
    `,
      queryParams
    );

    return { images, hasMore: images.length === minLimitPlusOne };
  }
  @FieldResolver(() => User)
  user(@Root() image: Image, @Ctx() { userLoader }: MyContext) {
    return userLoader.load(image.userId);
  }
}
