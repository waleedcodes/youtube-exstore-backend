("use strict");
const stripe = require("stripe")('sk_test_51NJHc9Kg3ytMsovyKjWiuhI3ICtI5vsrZPqPP6dQ8TOJNMCHAvZultBIDZMm3pWaqfl1TEnrsXk2sarZuobYGoOz00Ub8YpiVZ');

/**
 * order controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
    async create(ctx) {
        const { products } = ctx.request.body;
        try {
            const lineItems = await Promise.all(
                products.map(async (product) => {
                    const item = await strapi
                        .service("api::product.product")
                        .findOne(product.id);

                    return {
                        price_data: {
                            currency: "inr",
                            product_data: {
                                name: item.title,
                            },
                            unit_amount: Math.round(item.price * 100),
                        },
                        quantity: product.attributes.quantity,
                    };
                })
            );

            const session = await stripe.checkout.sessions.create({
                // shipping_address_collection: { allowed_countries: ["IN"] },
                payment_method_types: ["card"],
                mode: "payment",
                success_url: process.env.CLIENT_URL + "/success",
                cancel_url: process.env.CLIENT_URL + "?success=false",
                line_items: lineItems,
            });

            await strapi
                .service("api::order.order")
                .create({ data: { products, stripeid: session.id } });

            return { stripeSession: session };
        } catch (error) {
            ctx.response.status = 500;
            return { error };
        }
    },
}));